export const snakeToCamel = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map((item) => snakeToCamel(item));
    }

    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
        return obj;
    }

    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key.replace(/(_\w)/g, match => match[1].toUpperCase()),
            snakeToCamel(value)
        ])
    );
};