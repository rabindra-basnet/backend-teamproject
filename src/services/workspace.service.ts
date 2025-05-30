import mongoose from "mongoose";
import { Roles } from "../enums/role.enum";
import MemberModel from "../models/member.model";
import RoleModel from "../models/roles-permission.model";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import { BadRequestException, NotFoundException } from "../utils/appError";
import TaskModel from "../models/task.model";
import { TaskStatusEnum } from "../enums/task.enum";
import ProjectModel from "../models/project.model";
import logger from "../utils/logger"; 

//********************************
// CREATE NEW WORKSPACE
//**************** **************/
export const createWorkspaceService = async (
  userId: string,
  body: {
    name: string;
    description?: string | undefined;
  }
) => {
  logger.info(`Creating workspace for user ${userId} with name: ${body.name}`);

  const { name, description } = body;

  const user = await UserModel.findById(userId);

  if (!user) {
    logger.error(`User not found: ${userId}`);
    throw new NotFoundException("User not found");
  }

  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });

  if (!ownerRole) {
    logger.error("Owner role not found");
    throw new NotFoundException("Owner role not found");
  }

  const workspace = new WorkspaceModel({
    name: name,
    description: description,
    owner: user._id,
  });

  await workspace.save();
  logger.info(`Workspace created with id: ${workspace._id}`);

  const member = new MemberModel({
    userId: user._id,
    workspaceId: workspace._id,
    role: ownerRole._id,
    joinedAt: new Date(),
  });

  await member.save();
  logger.info(`User ${userId} added as member with role OWNER to workspace ${workspace._id}`);

  user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
  await user.save();

  return {
    workspace,
  };
};

//********************************
// GET WORKSPACES USER IS A MEMBER
//**************** **************/
export const getAllWorkspacesUserIsMemberService = async (userId: string) => {
  logger.info(`Fetching all workspaces for user: ${userId}`);

  const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .select("-password")
    .exec();

  const workspaces = memberships.map((membership) => membership.workspaceId);

  logger.info(`Found ${workspaces.length} workspaces for user: ${userId}`);

  return { workspaces };
};

export const getWorkspaceByIdService = async (workspaceId: string) => {
  logger.info(`Fetching workspace by id: ${workspaceId}`);

  const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    logger.error(`Workspace not found: ${workspaceId}`);
    throw new NotFoundException("Workspace not found");
  }

  const members = await MemberModel.find({
    workspaceId,
  }).populate("role");

  const workspaceWithMembers = {
    ...workspace.toObject(),
    members,
  };

  return {
    workspace: workspaceWithMembers,
  };
};

//********************************
// GET ALL MEMBERS IN WORKSPACE
//**************** **************/

export const getWorkspaceMembersService = async (workspaceId: string) => {
  logger.info(`Fetching members for workspace: ${workspaceId}`);

  const members = await MemberModel.find({
    workspaceId,
  })
    .populate("userId", "name email profilePicture -password")
    .populate("role", "name");

  const roles = await RoleModel.find({}, { name: 1, _id: 1 })
    .select("-permission")
    .lean();

  logger.info(`Found ${members.length} members and ${roles.length} roles in workspace ${workspaceId}`);

  return { members, roles };
};

export const getWorkspaceAnalyticsService = async (workspaceId: string) => {
  logger.info(`Fetching analytics for workspace: ${workspaceId}`);

  const currentDate = new Date();

  const totalTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
  });

  const overdueTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    dueDate: { $lt: currentDate },
    status: { $ne: TaskStatusEnum.DONE },
  });

  const completedTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    status: TaskStatusEnum.DONE,
  });

  const analytics = {
    totalTasks,
    overdueTasks,
    completedTasks,
  };

  logger.info(`Workspace ${workspaceId} analytics: totalTasks=${totalTasks}, overdueTasks=${overdueTasks}, completedTasks=${completedTasks}`);

  return { analytics };
};

export const changeMemberRoleService = async (
  workspaceId: string,
  memberId: string,
  roleId: string
) => {
  logger.info(`Changing role for member ${memberId} in workspace ${workspaceId} to role ${roleId}`);

  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    logger.error(`Workspace not found: ${workspaceId}`);
    throw new NotFoundException("Workspace not found");
  }

  const role = await RoleModel.findById(roleId);
  if (!role) {
    logger.error(`Role not found: ${roleId}`);
    throw new NotFoundException("Role not found");
  }

  const member = await MemberModel.findOne({
    userId: memberId,
    workspaceId: workspaceId,
  });

  if (!member) {
    logger.error(`Member ${memberId} not found in workspace ${workspaceId}`);
    throw new Error("Member not found in the workspace");
  }

  member.role = role;
  await member.save();

  logger.info(`Member ${memberId} role changed to ${role.name} in workspace ${workspaceId}`);

  return {
    member,
  };
};

//********************************
// UPDATE WORKSPACE
//**************** **************/
export const updateWorkspaceByIdService = async (
  workspaceId: string,
  name: string,
  description?: string
) => {
  logger.info(`Updating workspace ${workspaceId}`);

  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    logger.error(`Workspace not found: ${workspaceId}`);
    throw new NotFoundException("Workspace not found");
  }

  workspace.name = name || workspace.name;
  workspace.description = description || workspace.description;
  await workspace.save();

  logger.info(`Workspace ${workspaceId} updated successfully`);

  return {
    workspace,
  };
};

export const deleteWorkspaceService = async (
  workspaceId: string,
  userId: string
) => {
  logger.info(`Deleting workspace ${workspaceId} requested by user ${userId}`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workspace = await WorkspaceModel.findById(workspaceId).session(
      session
    );
    if (!workspace) {
      logger.error(`Workspace not found: ${workspaceId}`);
      throw new NotFoundException("Workspace not found");
    }

    if (!workspace.owner.equals(new mongoose.Types.ObjectId(userId))) {
      logger.error(`User ${userId} not authorized to delete workspace ${workspaceId}`);
      throw new BadRequestException(
        "You are not authorized to delete this workspace"
      );
    }

    const user = await UserModel.findById(userId).session(session);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      throw new NotFoundException("User not found");
    }

    await ProjectModel.deleteMany({ workspace: workspace._id }).session(
      session
    );
    await TaskModel.deleteMany({ workspace: workspace._id }).session(session);

    await MemberModel.deleteMany({
      workspaceId: workspace._id,
    }).session(session);

    if (user?.currentWorkspace?.equals(workspaceId)) {
      const memberWorkspace = await MemberModel.findOne({ userId }).session(
        session
      );
      user.currentWorkspace = memberWorkspace
        ? memberWorkspace.workspaceId
        : null;

      await user.save({ session });
      logger.info(`User ${userId} currentWorkspace updated after deletion`);
    }

    await workspace.deleteOne({ session });

    await session.commitTransaction();

    session.endSession();

    logger.info(`Workspace ${workspaceId} deleted successfully`);

    return {
      currentWorkspace: user.currentWorkspace,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error instanceof Error) {
      logger.error(`Error deleting workspace ${workspaceId}: ${error.message}`);
    } else {
      logger.error(`Error deleting workspace ${workspaceId}: ${JSON.stringify(error)}`);
    }
    throw error;
  }
};
