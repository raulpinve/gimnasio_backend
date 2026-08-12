const { throwUnauthorizedError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { generarTokenAutenticacion, generateAccessToken, compareHashedPassword } = require("../utils/hash.helper");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { snakeToCamel } = require("../utils/utils.helper");
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

exports.authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            throwUnauthorizedError("Token de autenticación requerido.");
        }

        if (!authHeader.startsWith("Bearer ")) {
            throwUnauthorizedError("El token debe usar el esquema Bearer.");
        }

        const token = authHeader.slice(7).trim();
        // console.log(token);

        if (!token) {
            throwUnauthorizedError("Token de autenticación requerido.");
        }

        let decodedToken;

        try {
            decodedToken = await getAuth().verifyIdToken(token);
        } catch (error) {
            throwUnauthorizedError("Token inválido o expirado.");
        }

        const firebaseUid = decodedToken.uid;
        let { rows } = await pool.query(
            `SELECT id FROM users WHERE firebase_uid = $1`,
            [firebaseUid]
        );

        if (rows.length === 0) {
            const email = decodedToken.email;
            const name = decodedToken.name || "Usuario";

            const insertResult = await pool.query(
                `INSERT INTO users (
                    firebase_uid,
                    email,
                    first_name,
                    last_name
                )
                VALUES ($1, $2, $3, $4)
                RETURNING id, firebase_uid, email, first_name, last_name`,
                [
                    firebaseUid,
                    email,
                    name,
                    "",
                ]
            );

            rows = insertResult.rows;
        } else {
        }

        req.user = {
            id: rows[0].id,
            firebaseUid,
        };
        next();
    } catch (error) {
        next(error);
    }
};

exports.register = async (req, res, next) => {
    try {
        const { firstName, lastName, username, email, password } = req.body;

        if (!firstName || !lastName || !username || !email || !password) {
            return throwBadRequestError("Todos los campos son obligatorios.");
        }

        // Validaciones de unicidad (Username)
        const { rows: existingUsername } = await pool.query(
            `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
            [username]
        );
        if (existingUsername.length > 0) return throwBadRequestError("El username ya está en uso.");

        // Validaciones de unicidad (Email)
        const { rows: existingEmail } = await pool.query(
            `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
            [email]
        );
        if (existingEmail.length > 0) return throwBadRequestError("El email ya está en uso.");

        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. CREAR USUARIO (Devolvemos los campos necesarios para el perfil)
        const { rows } = await pool.query(
            `INSERT INTO users (first_name, last_name, username, email, password)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, first_name, last_name, username, email`,
            [
                firstName.trim(),
                lastName.trim(),
                username.trim(),
                email.toLowerCase().trim(),
                hashedPassword
            ]
        );

        // Convertimos a camelCase usando la utilidad snakeToCamel
        const newUser = snakeToCamel(rows[0]);

        // 2. GENERAR TOKENS
        const accessToken = generateAccessToken({ id: newUser.id });

        // 3. RESPUESTA COMPLETA 
        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Usuario registrado.",
            data: {
                accessToken,
                user: newUser 
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        // 1. OBTENER INFORMACIÓN COMPLETA (Añadimos first_name, last_name, email)
        const { rows } = await pool.query(
            `SELECT id, password, username, first_name, last_name, email, avatar, avatar_thumbnail
             FROM users
             WHERE LOWER(username) = LOWER($1)`,
            [username]
        );

        const userFound = rows[0];
        if (!userFound) {
            throwUnauthorizedError("El usuario o la contraseña no son correctas.");
        }

        // 2. VERIFICAR CONTRASEÑA
        if (!compareHashedPassword(password, userFound.password)) {
            throwUnauthorizedError("El usuario o la contraseña no son correctas.");
        }

        // 3. GENERAR TOKENS
        const accessToken = generateAccessToken({ id: userFound.id });

        // 4. LIMPIAR OBJETO PARA EL FRONTEND (Quitamos el password y normalizamos)
        const { password: _, ...userDataRaw } = userFound;
        const user = snakeToCamel(userDataRaw);

        // 7. RESPUESTA DINÁMICA
        return res.json({
            statusCode: 200,
            status: "success",
            message: "Inicio de sesión exitoso.",
            data: {
                accessToken,
                user 
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.me = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Obtener información del usuario
        const { rows } = await pool.query(`
            SELECT id, first_name, last_name, username, email FROM users
            WHERE id = $1 
        `, [userId]);

        const user = rows[0];
        if (!user) {
            throwUnauthorizedError("El usuario no existe o fue eliminado.");
        }

        return res.json({
            statusCode: 200,
            status: "success",
            data: {
                id: user.id,
                firstName: user.first_name,
                middleName: user.middle_name,
                lastName: user.last_name,
                secondLastName: user.second_last_name,
                username: user.username,
                email: user.email,
                emailVerified: user.email_verified,
                companyId: user.company_id,
                role: user.role,
            }
        });

    } catch (error) {
        next(error);
    }
};
