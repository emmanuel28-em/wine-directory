import assert from "node:assert/strict";
import test from "node:test";
import { canInviteRole, canManageWorkspace } from "./permissions.js";

test("restaurant roles form a clear invite hierarchy", () => {
  assert.equal(canInviteRole("owner", "admin"), true);
  assert.equal(canInviteRole("admin", "admin"), false);
  assert.equal(canInviteRole("admin", "manager"), true);
  assert.equal(canInviteRole("manager", "manager"), false);
  assert.equal(canInviteRole("manager", "staff"), true);
  assert.equal(canInviteRole("staff", "staff"), false);
});

test("only account owners and admins manage workspace settings", () => {
  assert.equal(canManageWorkspace("owner"), true);
  assert.equal(canManageWorkspace("admin"), true);
  assert.equal(canManageWorkspace("manager"), false);
  assert.equal(canManageWorkspace("staff"), false);
});
