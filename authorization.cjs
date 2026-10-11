'use strict';

const ROLES = Object.freeze(['Admin', 'Editor', 'Commenter', 'Viewer']);
const PERMISSIONS = Object.freeze({
  read: ROLES,
  edit: ['Admin', 'Editor'],
  comment: ['Admin', 'Editor', 'Commenter'],
  invite: ['Admin', 'Editor'],
  administer: ['Admin']
});

function memberRole(resource, userId) {
  if (typeof userId !== 'string' || !userId) return null;
  const members = (Array.isArray(resource?.members) ? resource.members : [])
    .filter((member) => member.userId === userId);
  // Ambiguous or unrecognized membership records never grant access.
  return members.length === 1 && ROLES.includes(members[0].role) ? members[0].role : null;
}

function workspaceRole(db, workspaceId, userId) {
  return memberRole(db.workspaces.find((workspace) => workspace.id === workspaceId), userId);
}

function projectRole(db, project, userId) {
  if (!project || typeof userId !== 'string' || !userId) return null;
  if (!db.workspaces.some((workspace) => workspace.id === project.workspaceId)) return null;
  if (project.ownerId === userId) return 'Admin';
  const explicitRole = memberRole(project, userId);
  // Workspace administrators may open projects, not inherit mutation powers.
  return explicitRole || (workspaceRole(db, project.workspaceId, userId) === 'Admin' ? 'Viewer' : null);
}

function canProject(db, project, userId, permission = 'read') {
  return (PERMISSIONS[permission] || []).includes(projectRole(db, project, userId));
}

function canWorkspace(db, workspace, userId, permission = 'read') {
  return (PERMISSIONS[permission] || []).includes(memberRole(workspace, userId));
}

function canReadActivity(db, activity, userId) {
  if (activity.projectId) return canProject(db, db.projects.find((p) => p.id === activity.projectId), userId);
  if (activity.workspaceId) return Boolean(workspaceRole(db, activity.workspaceId, userId));
  // Legacy unscoped activity cannot be assumed to belong to a shared workspace.
  return activity.userId === userId;
}

function canReceiveEvent(db, client, { projectId, workspaceId }, now = Date.now()) {
  if (!client.expiresAt || client.expiresAt <= now) return false;
  if (!db.users.some((user) => user.id === client.userId)) return false;
  if (projectId) {
    if (client.projectId && client.projectId !== projectId) return false;
    return canProject(db, db.projects.find((p) => p.id === projectId), client.userId);
  }
  if (workspaceId) return Boolean(workspaceRole(db, workspaceId, client.userId));
  return false;
}

function findBoundUser(db, authUser) {
  if (typeof authUser?.id !== 'string' || !authUser.id) return null;
  const users = db.users.filter((user) => user.id === authUser.id || user.authUserId === authUser.id);
  if (users.length > 1 || (users[0]?.authUserId && users[0].authUserId !== authUser.id)) {
    throw new Error('Conflicting account identity mapping.');
  }
  if (users.length === 1) return users[0];
  if (!authUser.email_confirmed_at || typeof authUser.email !== 'string' || !authUser.email.trim()) return null;
  const email = authUser.email.trim().toLowerCase();
  const invitations = db.users.filter((user) => user.invited === true && !user.authUserId && user.email?.toLowerCase() === email);
  if (invitations.length > 1) throw new Error('Conflicting invitation identity mapping.');
  if (invitations[0]) validatePendingProjectInvitation(db, invitations[0].id);
  return invitations[0] || null;
}

function validatePendingProjectInvitation(db, invitationId) {
  // Only new, unused project-invitation placeholders may be claimed automatically.
  // Legacy owners, workspace members and content authors require operator review.
  const hasHistory = db.workspaces.some((workspace) => workspace.members.some((member) => member.userId === invitationId))
    || db.projects.some((project) => project.ownerId === invitationId
      || project.comments.some((comment) => comment.userId === invitationId)
      || project.versions.some((version) => version.userId === invitationId))
    || db.activities.some((activity) => activity.userId === invitationId);
  if (hasHistory) throw new Error('This invitation needs an account identity review.');
  for (const project of db.projects) {
    const memberships = project.members.filter((member) => member.userId === invitationId);
    if (memberships.length > 1 || memberships.some((member) => !ROLES.includes(member.role))) {
      throw new Error('This invitation needs an account identity review.');
    }
  }
}

function claimPendingProjectInvitation(db, user, authUser) {
  if (!authUser.email_confirmed_at || typeof authUser.email !== 'string' || !authUser.email.trim()) return;
  const email = authUser.email.trim().toLowerCase();
  const pending = db.users.filter((candidate) => candidate.id !== user.id && candidate.invited === true && !candidate.authUserId && candidate.email?.toLowerCase() === email);
  if (pending.length > 1) throw new Error('Conflicting invitation identity mapping.');
  if (!pending.length) return;
  const invitationId = pending[0].id;
  validatePendingProjectInvitation(db, invitationId);
  for (const project of db.projects) {
    const membership = project.members.find((member) => member.userId === invitationId);
    if (!membership) continue;
    // Keep an existing explicit assignment; a pending invitation cannot elevate it.
    if (!project.members.some((member) => member.userId === user.id)) membership.userId = user.id;
    project.members = project.members.filter((member) => member.userId !== invitationId);
  }
  db.users = db.users.filter((candidate) => candidate.id !== invitationId);
}

module.exports = { ROLES, memberRole, workspaceRole, projectRole, canProject, canWorkspace, canReadActivity, canReceiveEvent, findBoundUser, claimPendingProjectInvitation };
