// export {};

import type { NextFunction, Request, Response } from "express";

interface AuthenticatedUser {
  role: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const checkRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Missing required parameters" });
    }

    const isAllowed = allowedRoles.includes(user.role);
    const isOpen = allowedRoles.includes("any");

    if (!isAllowed && !isOpen) {
      return res.status(403).json({ message: "insufficient permissions" });
    }

    return next();
  };
};

module.exports = checkRole;