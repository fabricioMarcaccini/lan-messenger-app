export const validateRequest = (schema) => async (ctx, next) => {
    try {
        // Parse request body. In Koa, the body is at ctx.request.body
        schema.parse(ctx.request.body);
        await next();
    } catch (error) {
        // Return generic 400 without exposing database schema or strict internals
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: 'Dados inválidos ou mal formatados na requisição.',
            // Optionally we can log error.errors internally, but we don't return it heavily to the client to avoid info leak
        };
    }
};
