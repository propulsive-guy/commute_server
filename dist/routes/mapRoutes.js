"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mapController_1 = require("../controllers/mapController");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
// Proxy endpoints for Google Maps
router.get('/directions', authMiddleware_1.default, mapController_1.getDirections);
router.get('/suggestions', authMiddleware_1.default, mapController_1.getAutocompleteSuggestions);
router.get('/details', authMiddleware_1.default, mapController_1.getPlaceDetails);
router.get('/geocode', authMiddleware_1.default, mapController_1.geocodeAddress);
exports.default = router;
