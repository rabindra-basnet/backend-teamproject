import logger from "../utils/logger";
import mongoose from "mongoose";
import UserModel from "../models/user.model";
import AccountModel from "../models/account.model";
import WorkspaceModel from "../models/workspace.model";
import RoleModel from "../models/roles-permission.model";
import { Roles } from "../enums/role.enum";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/appError";
import MemberModel from "../models/member.model";
import { ProviderEnum } from "../enums/account-provider.enum";

export const loginOrCreateAccountService = async (data: {
  provider: string;
  displayName: string;
  providerId: string;
  picture?: string;
  email?: string;
}) => {
  const { providerId, provider, displayName, email, picture } = data;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    logger.info("Started MongoDB session for loginOrCreateAccountService", { provider, email });

    let user = await UserModel.findOne({ email }).session(session);

    if (!user) {
      logger.info("No user found. Creating new user.", { email, displayName });

      user = new UserModel({
        email,
        name: displayName,
        profilePicture: picture || null,
      });
      await user.save({ session });
      logger.info("User created", { userId: user?._id as mongoose.Types.ObjectId, email });

      const account = new AccountModel({
        userId: user._id,
        provider,
        providerId,
      });
      await account.save({ session });
      logger.info("Account created", { userId: user?._id as mongoose.Types.ObjectId, provider, providerId });

      const workspace = new WorkspaceModel({
        name: `My Workspace`,
        description: `Workspace created for ${user.name}`,
        owner: user._id,
      });
      await workspace.save({ session });
      logger.info("Workspace created", { workspaceId: workspace?._id as mongoose.Types.ObjectId, ownerId: user?._id as mongoose.Types.ObjectId });

      const ownerRole = await RoleModel.findOne({
        name: Roles.OWNER,
      }).session(session);

      if (!ownerRole) {
        logger.error("Owner role not found");
        throw new NotFoundException("Owner role not found");
      }

      const member = new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: ownerRole._id,
        joinedAt: new Date(),
      });
      await member.save({ session });
      logger.info("Member created with OWNER role", { userId: user?._id as mongoose.Types.ObjectId, workspaceId: workspace?._id as mongoose.Types.ObjectId });

      user.currentWorkspace = workspace?._id as mongoose.Types.ObjectId;
      await user.save({ session });
      logger.info("Set user's currentWorkspace", { userId: user?._id as mongoose.Types.ObjectId, workspaceId: workspace?._id as mongoose.Types.ObjectId });
    } else {
      logger.info("User found, skipping creation", { email, userId: user?._id as mongoose.Types.ObjectId });
    }

    await session.commitTransaction();
    logger.info("MongoDB transaction committed");
    session.endSession();
    logger.info("MongoDB session ended");

    return { user };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error("Error in loginOrCreateAccountService", { error });
    throw error;
  }
};

export const registerUserService = async (body: {
  email: string;
  name: string;
  password: string;
}) => {
  const { email, name, password } = body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    logger.info("Started MongoDB session for registerUserService", { email, name });

    const existingUser = await UserModel.findOne({ email }).session(session);
    if (existingUser) {
      logger.warn("Registration attempt with existing email", { email });
      throw new BadRequestException("Email already exists");
    }

    const user = new UserModel({
      email,
      name,
      password,
    });
    await user.save({ session });
    logger.info("User registered", { userId: user._id as mongoose.Types.ObjectId, email });

    const account = new AccountModel({
      userId: user._id,
      provider: ProviderEnum.EMAIL,
      providerId: email,
    });
    await account.save({ session });
    logger.info("Account created", { userId: user._id as mongoose.Types.ObjectId, provider: ProviderEnum.EMAIL });

    const workspace = new WorkspaceModel({
      name: `My Workspace`,
      description: `Workspace created for ${user.name}`,
      owner: user._id,
    });
    await workspace.save({ session });
    logger.info("Workspace created", { workspaceId: workspace._id as mongoose.Types.ObjectId, ownerId: user._id as mongoose.Types.ObjectId });

    const ownerRole = await RoleModel.findOne({
      name: Roles.OWNER,
    }).session(session);

    if (!ownerRole) {
      logger.error("Owner role not found");
      throw new NotFoundException("Owner role not found");
    }

    const member = new MemberModel({
      userId: user._id,
      workspaceId: workspace._id,
      role: ownerRole._id,
      joinedAt: new Date(),
    });
    await member.save({ session });
    logger.info("Member created with OWNER role", { userId: user._id as mongoose.Types.ObjectId, workspaceId: workspace._id as mongoose.Types.ObjectId });

    user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
    await user.save({ session });
    logger.info("Set user's currentWorkspace", { userId: user._id as mongoose.Types.ObjectId, workspaceId: workspace._id as mongoose.Types.ObjectId });

    await session.commitTransaction();
    logger.info("MongoDB transaction committed");
    session.endSession();
    logger.info("MongoDB session ended");

    return {
      userId: user._id,
      workspaceId: workspace._id,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error("Error in registerUserService", { error });
    throw error;
  }
};

export const verifyUserService = async ({
  email,
  password,
  provider = ProviderEnum.EMAIL,
}: {
  email: string;
  password: string;
  provider?: string;
}) => {
  try {
    logger.info("Verifying user", { email, provider });

    const account = await AccountModel.findOne({ provider, providerId: email });
    if (!account) {
      logger.warn("Account not found during verification", { email, provider });
      throw new NotFoundException("Invalid email or password");
    }

    const user = await UserModel.findById(account.userId);

    if (!user) {
      logger.warn("User not found for account", { email, userId: account.userId as mongoose.Types.ObjectId });
      throw new NotFoundException("User not found for the given account");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn("Invalid password attempt", { userId: user._id as mongoose.Types.ObjectId, email });
      throw new UnauthorizedException("Invalid email or password");
    }

    logger.info("User verified successfully", { userId: user?._id as mongoose.Types.ObjectId, email });
    return user.omitPassword();
  } catch (error) {
    logger.error("Error in verifyUserService", { error });
    throw error;
  }
};
