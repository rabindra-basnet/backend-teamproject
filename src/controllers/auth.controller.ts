import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { config } from "../config/app.config";
import { registerSchema } from "../validation/auth.validation";
import { HTTPSTATUS } from "../config/http.config";
import { registerUserService } from "../services/auth.service";
import passport from "passport";
import logger from "../utils/logger";

export const googleLoginCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const currentWorkspace = req.user?.currentWorkspace;

    if (!currentWorkspace) {
      logger.warn("Google login callback failed - no currentWorkspace", {
        user: req.user,
      });
      return res.redirect(
        `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure`
      );
    }

    logger.info("Google login callback success", {
      userId: req.user?._id,
      workspaceId: currentWorkspace,
    });

    return res.redirect(
      `${config.FRONTEND_ORIGIN}/workspace/${currentWorkspace}`
    );
  }
);

export const registerUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = registerSchema.parse({
      ...req.body,
    });

    await registerUserService(body);

    logger.info("User registered successfully", { email: body.email });

    return res.status(HTTPSTATUS.CREATED).json({
      message: "User created successfully",
    });
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      (
        err: Error | null,
        user: Express.User | false,
        info: { message: string } | undefined
      ) => {
        if (err) {
          logger.error("Error during local login authentication", { error: err });
          return next(err);
        }

        if (!user) {
          logger.warn("Local login failed", { reason: info?.message, email: req.body.email });
          return res.status(HTTPSTATUS.UNAUTHORIZED).json({
            message: info?.message || "Invalid email or password",
          });
        }

        req.logIn(user, (err) => {
          if (err) {
            logger.error("Error logging in user after local authentication", { error: err });
            return next(err);
          }

          logger.info("User logged in successfully", { userId: user._id });

          return res.status(HTTPSTATUS.OK).json({
            message: "Logged in successfully",
            user,
          });
        });
      }
    )(req, res, next);
  }
);

export const logOutController = asyncHandler(
  async (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        logger.error("Logout error", { error: err, userId: req.user?._id });
        return res
          .status(HTTPSTATUS.INTERNAL_SERVER_ERROR)
          .json({ error: "Failed to log out" });
      }

      req.session.destroy((err) => {
        if (err) {
          logger.error("Session destroy error on logout", { error: err, userId: req.user?._id });
          return res
            .status(HTTPSTATUS.INTERNAL_SERVER_ERROR)
            .json({ error: "Failed to destroy session" });
        }

        res.clearCookie("session"); // Optional cleanup

        logger.info("User logged out successfully", { userId: req.user?._id });

        return res
          .status(HTTPSTATUS.OK)
          .json({ message: "Logged out successfully" });
      });
    });
  }
);
