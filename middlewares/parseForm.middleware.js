import formidable from "formidable";

const ARRAY_FIELDS = ["muscleGroups"];

// Middleware to parse multipart forms using Formidable (v3)
const parseForm = (customOptions = {}) => {
    const defaultOptions = {
        keepExtensions: true,
        maxFileSize: 2 * 1024 * 1024, // 2MB
    };

    // `field` es solo para nuestros mensajes de error, no es una opción de formidable
    const { field = "archivo", ...formidableOptions } = customOptions;
    const options = { ...defaultOptions, ...formidableOptions };
    const maxMB = options.maxFileSize / (1024 * 1024);

    return (req, res, next) => {
        const form = formidable(options);

        form.parse(req, (err, fields, files) => {
            if (err) {
                // 1009 = archivo mayor que maxFileSize
                if (err.code === 1009 || err.code === "1009") {
                    return res.status(400).json({
                        statusCode: 400,
                        message: "Los datos proporcionados no son válidos",
                        error: {
                            fieldErrors: [{
                                field,
                                message: `El archivo excede el peso máximo permitido de ${maxMB}MB`,
                            }],
                        },
                    });
                }
                return next(err);
            }

            // En formidable v3 cada campo llega como array.
            // Dejamos valor único salvo en los campos que sí son listas.
            req.body = Object.fromEntries(
                Object.entries(fields).map(([key, value]) => {
                    if (ARRAY_FIELDS.includes(key)) {
                        return [key, Array.isArray(value) ? value : [value]];
                    }
                    return [key, Array.isArray(value) ? value[0] : value];
                })
            );

            // En v3 cada archivo también llega como array; lo aplanamos a un solo archivo
            req.files = Object.fromEntries(
                Object.entries(files).map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value[0] : value,
                ])
            );

            next();
        });
    };
};

export default parseForm;