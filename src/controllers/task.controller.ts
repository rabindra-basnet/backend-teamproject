import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  createTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from "../validation/task.validation";
import { projectIdSchema } from "../validation/project.validation";
import { workspaceIdSchema } from "../validation/workspace.validation";
import { Permissions } from "../enums/role.enum";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { roleGuard } from "../utils/roleGuard";
import {
  createTaskService,
  deleteTaskService,
  getAllTasksService,
  getTaskByIdService,
  updateTaskService,
} from "../services/task.service";
import { HTTPSTATUS } from "../config/http.config";
import logger from "../utils/logger";

export const createTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = createTaskSchema.parse(req.body);
    const projectId = projectIdSchema.parse(req.params.projectId);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    logger.info("Create task request", { userId, workspaceId, projectId, taskData: body });

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.CREATE_TASK]);

    const { task } = await createTaskService(workspaceId, projectId, userId, body);

    logger.info("Task created", { userId, workspaceId, projectId, taskId: task._id });

    return res.status(HTTPSTATUS.OK).json({
      message: "Task created successfully",
      task,
    });
  }
);

export const updateTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = updateTaskSchema.parse(req.body);
    const taskId = taskIdSchema.parse(req.params.id);
    const projectId = projectIdSchema.parse(req.params.projectId);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    logger.info("Update task request", { userId, workspaceId, projectId, taskId, updateData: body });

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.EDIT_TASK]);

    const { updatedTask } = await updateTaskService(workspaceId, projectId, taskId, body);

    logger.info("Task updated", { userId, workspaceId, projectId, taskId });

    return res.status(HTTPSTATUS.OK).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  }
);

export const getAllTasksController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    const filters = {
      projectId: req.query.projectId as string | undefined,
      status: req.query.status ? (req.query.status as string).split(",") : undefined,
      priority: req.query.priority ? (req.query.priority as string).split(",") : undefined,
      assignedTo: req.query.assignedTo ? (req.query.assignedTo as string).split(",") : undefined,
      keyword: req.query.keyword as string | undefined,
      dueDate: req.query.dueDate as string | undefined,
    };

    const pagination = {
      pageSize: parseInt(req.query.pageSize as string) || 10,
      pageNumber: parseInt(req.query.pageNumber as string) || 1,
    };

    logger.info("Fetch all tasks request", { userId, workspaceId, filters, pagination });

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const result = await getAllTasksService(workspaceId, filters, pagination);

    logger.info("Tasks fetched", { userId, workspaceId, totalCount: result.totalCount });

    return res.status(HTTPSTATUS.OK).json({
      message: "All tasks fetched successfully",
      ...result,
    });
  }
);

export const getTaskByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const taskId = taskIdSchema.parse(req.params.id);
    const projectId = projectIdSchema.parse(req.params.projectId);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    logger.info("Fetch task by id request", { userId, workspaceId, projectId, taskId });

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const task = await getTaskByIdService(workspaceId, projectId, taskId);

    logger.info("Task fetched", { userId, workspaceId, projectId, taskId });

    return res.status(HTTPSTATUS.OK).json({
      message: "Task fetched successfully",
      task,
    });
  }
);

export const deleteTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const taskId = taskIdSchema.parse(req.params.id);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    logger.info("Delete task request", { userId, workspaceId, taskId });

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.DELETE_TASK]);

    await deleteTaskService(workspaceId, taskId);

    logger.info("Task deleted", { userId, workspaceId, taskId });

    return res.status(HTTPSTATUS.OK).json({
      message: "Task deleted successfully",
    });
  }
);
