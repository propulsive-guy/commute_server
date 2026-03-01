import { Request, Response } from 'express';
import axios from 'axios';

// Move API key inside functions or access it via process.env directly to ensure it's loaded

export const getDirections = async (req: Request, res: Response) => {
    try {
        const { origin, destination, mode = 'driving' } = req.query;
        if (!origin || !destination) {
            return res.status(400).json({ msg: 'Origin and destination are required' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/directions/json`,
            {
                params: {
                    origin,
                    destination,
                    mode,
                    key: apiKey,
                },
            }
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('Proxy Directions Error:', error.message);
        res.status(500).json({ msg: 'Failed to fetch directions from Google' });
    }
};

export const getAutocompleteSuggestions = async (req: Request, res: Response) => {
    try {
        const { input, location, radius, components, types } = req.query;
        if (!input) {
            return res.status(400).json({ msg: 'Input is required' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const params: any = {
            input,
            key: apiKey,
            components: components || 'country:in',
            types: types || 'geocode',
        };

        if (location) params.location = location;
        if (radius) params.radius = radius;

        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
            { params }
        );

        res.json(response.data);
    } catch (error: any) {
        console.error('Proxy Autocomplete Error:', error.response?.data || error.message);
        res.status(500).json({ msg: 'Failed to fetch suggestions from Google', error: error.message });
    }
};

export const getPlaceDetails = async (req: Request, res: Response) => {
    try {
        const { place_id, fields } = req.query;
        if (!place_id) {
            return res.status(400).json({ msg: 'Place ID is required' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/place/details/json`,
            {
                params: {
                    place_id,
                    fields,
                    key: apiKey,
                },
            }
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('Proxy Place Details Error:', error.message);
        res.status(500).json({ msg: 'Failed to fetch place details from Google' });
    }
};

export const geocodeAddress = async (req: Request, res: Response) => {
    try {
        const { address, components } = req.query;
        if (!address) {
            return res.status(400).json({ msg: 'Address is required' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json`,
            {
                params: {
                    address,
                    key: apiKey,
                    components: components || 'country:IN',
                },
            }
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('Proxy Geocode Error:', error.message);
        res.status(500).json({ msg: 'Failed to geocode address' });
    }
};
