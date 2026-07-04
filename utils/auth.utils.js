
export const  generateAccessToken = (user) => {
    return jwt.sign(
		{ id: user.id },
		process.env.ACCESS_TOKEN_SECRET,
		{ expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME }
	);
}