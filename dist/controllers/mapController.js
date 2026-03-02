"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodeAddress = exports.getPlaceDetails = exports.getAutocompleteSuggestions = exports.getDirections = void 0;
const axios_1 = __importDefault(require("axios"));
// Move API key inside functions or access it via process.env directly to ensure it's loaded
const getDirections = async (req, res) => {
    try {
        const { origin, destination, mode = 'driving' } = req.query;
        if (!origin || !destination) {
            return res.status(400).json({ msg: 'Origin and destination are required' });
        }
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios_1.default.get(`https://maps.googleapis.com/maps/api/directions/json`, {
            params: {
                origin,
                destination,
                mode,
                key: apiKey,
            },
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Proxy Directions Error:', error.message);
        res.status(500).json({ msg: 'Failed to fetch directions from Google' });
    }
};
exports.getDirections = getDirections;
const getAutocompleteSuggestions = async (req, res) => {
    try {
        const { input, location, radius, components, types } = req.query;
        if (!input) {
            return res.status(400).json({ msg: 'Input is required' });
        }
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const params = {
            input,
            key: apiKey,
            components: components || 'country:in',
            types: types || 'geocode',
        };
        if (location)
            params.location = location;
        if (radius)
            params.radius = radius;
        const response = await axios_1.default.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, { params });
        res.json(response.data);
    }
    catch (error) {
        console.error('Proxy Autocomplete Error:', error.response?.data || error.message);
        res.status(500).json({ msg: 'Failed to fetch suggestions from Google', error: error.message });
    }
};
exports.getAutocompleteSuggestions = getAutocompleteSuggestions;
const getPlaceDetails = async (req, res) => {
    try {
        const { place_id, fields } = req.query;
        if (!place_id) {
            return res.status(400).json({ msg: 'Place ID is required' });
        }
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios_1.default.get(`https://maps.googleapis.com/maps/api/place/details/json`, {
            params: {
                place_id,
                fields,
                key: apiKey,
            },
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Proxy Place Details Error:', error.message);
        res.status(500).json({ msg: 'Failed to fetch place details from Google' });
    }
};
exports.getPlaceDetails = getPlaceDetails;
const geocodeAddress = async (req, res) => {
    try {
        const { address, components } = req.query;
        if (!address) {
            return res.status(400).json({ msg: 'Address is required' });
        }
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios_1.default.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
                address,
                key: apiKey,
                components: components || 'country:IN',
            },
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Proxy Geocode Error:', error.message);
        res.status(500).json({ msg: 'Failed to geocode address' });
    }
};
exports.geocodeAddress = geocodeAddress;
