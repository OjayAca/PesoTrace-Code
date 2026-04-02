import jwt from "jsonwebtoken";

function getJwtSecret() {
  return process.env.JWT_SECRET || "pesotrace-dev-secret";
}

export function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: "7d",
    },
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Your session is invalid or expired." });
  }
}
