"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = globalSetup;
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
function globalSetup() {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) {
        throw new Error('TEST_DATABASE_URL is not set. Cannot prepare the test database.');
    }
    (0, child_process_1.execSync)('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: testUrl },
    });
}
//# sourceMappingURL=globalSetup.js.map