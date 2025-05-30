import passport from "passport";
import { Request } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";

import { config } from "./app.config";
import { NotFoundException } from "../utils/appError";
import { ProviderEnum } from "../enums/account-provider.enum";
import {
  loginOrCreateAccountService,
  verifyUserService,
} from "../services/auth.service";
import logger from "../utils/logger";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
      passReqToCallback: true,
    },
    async (req: Request, accessToken, refreshToken, profile, done) => {
      try {
        const { email, sub: googleId, picture } = profile._json;
        logger.info("Google OAuth profile received", { profile, googleId });

        if (!googleId) {
          const error = new NotFoundException("Google ID (sub) is missing");
          logger.error("Google ID missing in OAuth profile", { error });
          throw error;
        }

        const { user } = await loginOrCreateAccountService({
          provider: ProviderEnum.GOOGLE,
          displayName: profile.displayName,
          providerId: googleId,
          picture: picture,
          email: email,
        });
        logger.info("User logged in or created via Google OAuth", { userId: user._id });
        done(null, user);
      } catch (error) {
        logger.error("Error during Google OAuth login", { error });
        done(error, false);
      }
    }
  )
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: true,
    },
    async (email, password, done) => {
      try {
        const user = await verifyUserService({ email, password });
        logger.info("User verified via local strategy", { email, userId: user._id });
        return done(null, user);
      } catch (error: any) {
        logger.error("Local strategy verification failed", { email, error });
        return done(error, false, { message: error?.message });
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  logger.info("Serializing user", { userId: user._id });
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  logger.info("Deserializing user", { userId: user._id });
  done(null, user);
});
