"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const register_1 = __importDefault(require("./controllers/register/register"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/register', register_1.default);
app.listen(3000, () => {
    console.log('Servidor corriendo por el puerto 3000');
});
