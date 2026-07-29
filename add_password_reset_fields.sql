-- Agregar campos para recuperación de contraseña
ALTER TABLE `account_requests` 
ADD COLUMN `reset_token` VARCHAR(64) NULL DEFAULT NULL AFTER `password`,
ADD COLUMN `reset_token_expiry` DATETIME NULL DEFAULT NULL AFTER `reset_token`,
ADD INDEX `idx_reset_token` (`reset_token`);

-- Comentario: Estos campos se utilizan para la funcionalidad de recuperación de contraseña
-- reset_token: Token único generado para restablecer la contraseña
-- reset_token_expiry: Fecha y hora de expiración del token (generalmente 1 hora)
