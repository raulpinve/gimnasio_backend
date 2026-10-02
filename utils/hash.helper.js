import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const hashPassword = (password) => {
    return bcrypt.hashSync(password, 10);
}

export const compareHashedPassword = (password, hashedPassword) => {
    return bcrypt.compareSync(password, hashedPassword)
}

export const generateAccessToken = (user) => {
	return jwt.sign(
		{ id: user.id },
		process.env.ACCESS_TOKEN_SECRET,
		{ expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME }
	);
}

export const generateRefreshToken = (user) =>{
	return jwt.sign(
		{ id: user.id },
		process.env.REFRESH_TOKEN_SECRET,
		{ expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME }
	);
}

export const generateImageToken = (entityType, id, thumbnail = false) => {
	if (!validTypes.includes(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}`);
    }
    const token = jwt.sign({ id, entityType }, SECRET, { expiresIn: "1h" });

    return `${process.env.BACKEND_URL}/images/${entityType}/${id}/avatar${thumbnail ? "/thumbnail" : ""}?token=${token}`;
}

export const generatePasswordResetToken = () => {
    return crypto.randomBytes(20).toString("hex"); 
};
