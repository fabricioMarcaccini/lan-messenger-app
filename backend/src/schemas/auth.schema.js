import { z } from 'zod';

const registerRequiredMessage = 'Nome da empresa, username, email e password são obrigatórios';

export const registerSchema = z.object({
    companyName: z.string({ required_error: registerRequiredMessage }).min(1, registerRequiredMessage),
    username: z.string({ required_error: registerRequiredMessage }).min(1, registerRequiredMessage),
    email: z.string({ required_error: registerRequiredMessage }).min(1, registerRequiredMessage),
    password: z.string({ required_error: registerRequiredMessage }).min(1, registerRequiredMessage),
    fullName: z.string().optional(),
}).strip().superRefine((data, ctx) => {
    const passwordTrimmedLength = data.password.trim().length;
    if (passwordTrimmedLength < 6 || data.password.length > 72) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Senha deve ter entre 6 e 72 caracteres válidos',
        });
        return;
    }

    if (data.companyName.length > 100 || data.username.length > 50 || (data.fullName && data.fullName.length > 100)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Campos excedem o tamanho máximo permitido',
        });
        return;
    }

    if (/[<>]/.test(data.companyName) || /[<>]/.test(data.username) || (data.fullName && /[<>]/.test(data.fullName))) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Caracteres inválidos detectados',
        });
        return;
    }

    if (data.companyName.trim().length < 2) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Nome da empresa deve ter pelo menos 2 caracteres',
        });
    }
});

export const inviteJoinSchema = z.object({
    username: z.string({ required_error: 'Preencha todos os campos obrigatórios' }).min(1, 'Preencha todos os campos obrigatórios'),
    email: z.string({ required_error: 'Preencha todos os campos obrigatórios' }).min(1, 'Preencha todos os campos obrigatórios'),
    password: z.string({ required_error: 'Preencha todos os campos obrigatórios' }).min(1, 'Preencha todos os campos obrigatórios'),
    fullName: z.string().optional(),
}).strip();

export const loginSchema = z.object({
    username: z.string({ required_error: 'Username e password são obrigatórios' }).min(1, 'Username e password são obrigatórios'),
    password: z.string({ required_error: 'Username e password são obrigatórios' }).min(1, 'Username e password são obrigatórios'),
}).strip();

export const googleLoginSchema = z.object({
    token: z.string({ required_error: 'Token Google é obrigatório' }).min(1, 'Token Google é obrigatório'),
}).strip();

export const verifyLoginSchema = z.object({
    tempToken: z.string({ required_error: 'Parâmetros inválidos' }).min(1, 'Parâmetros inválidos'),
    token: z.string({ required_error: 'Parâmetros inválidos' }).min(1, 'Parâmetros inválidos'),
}).strip();

export const refreshSchema = z.object({
    refreshToken: z.string({ required_error: 'Refresh token é obrigatório' }).min(1, 'Refresh token é obrigatório'),
}).strip();

export const forgotPasswordSchema = z.object({
    username: z.string({ required_error: 'Username ou email é obrigatório' }).min(1, 'Username ou email é obrigatório'),
}).strip();

export const adminResetPasswordSchema = z.object({
    userId: z.string({ required_error: 'userId e newPassword são obrigatórios' }).min(1, 'userId e newPassword são obrigatórios'),
    newPassword: z.string({ required_error: 'userId e newPassword são obrigatórios' }).min(1, 'userId e newPassword são obrigatórios'),
}).strip().superRefine((data, ctx) => {
    const passwordTrimmedLength = data.newPassword.trim().length;
    if (passwordTrimmedLength < 6 || data.newPassword.length > 72) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Senha deve ter entre 6 e 72 caracteres válidos',
        });
    }
});

export const twoFactorTokenSchema = z.object({
    token: z.string({ required_error: 'Código inválido' }).min(1, 'Código inválido'),
}).strip();
