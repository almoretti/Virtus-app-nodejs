export interface AuthResult {
    success: boolean;
    user?: any;
    scopes?: string[];
    error?: string;
}
export declare function validateApiToken(token: string): Promise<AuthResult>;
export declare function extractTokenFromRequest(headers: Headers): string | null;
