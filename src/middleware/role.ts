// export {};

import type { NextFunction, Request, Response } from "express";

const checkRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Missing required parameters" });
    }

    const isAllowed = user.role ? allowedRoles.includes(user.role) : false;
    const isOpen = allowedRoles.includes("any")

    if (!isAllowed && !isOpen) {
      return res.status(403).json({ message: "insufficient permissions" });
    }

    return next();
  };
};

module.exports = checkRole;