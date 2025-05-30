import { PermissionType, Permissions } from "../enums/role.enum";
import { UnauthorizedException } from "./appError";
import { RolePermissions } from "./role-permission";
import logger from "./logger";  // <-- import your Winston logger

export const roleGuard = (
  role: keyof typeof RolePermissions,
  requiredPermissions: PermissionType[]
) => {
  const permissions = RolePermissions[role];
  
  const hasPermission = requiredPermissions.every((permission) =>
    permissions?.includes(permission)
  );

  if (!hasPermission) {
    logger.warn(`Unauthorized access attempt by role: ${role} - missing permissions: ${requiredPermissions.join(", ")}`);
    throw new UnauthorizedException(
      "You do not have the necessary permissions to perform this action"
    );
  } else {
    logger.info(`Access granted for role: ${role} with permissions: ${permissions.join(", ")}`);
  }
};
