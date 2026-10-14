// Base pública del backend. En producción define PUBLIC_URL (ej. https://api.tudominio.com)
const baseUrl = (req) =>
    process.env.PUBLIC_URL ?? `${req.protocol}://${req.get('host')}`;

// Recibe un ejercicio ya en camelCase y convierte los nombres de archivo en URLs
export const withMediaUrls = (req, exercise) => {
    const folder = `${baseUrl(req)}/uploads/${exercise.id}`;
    const url = (file) => (file ? `${folder}/${encodeURIComponent(file)}` : null);

    return {
        ...exercise,
        avatar: url(exercise.avatar),
        avatarThumbnail: url(exercise.avatarThumbnail),
        video: url(exercise.video),
    };
};