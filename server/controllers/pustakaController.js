import { knex } from '../db.js';

export const getGuides = async (req, res) => {
    try {
        const { category } = req.query;
        let query = knex('pustaka_guides').select('*');
        if (category) {
            query = query.where('category', category);
        }
        const rows = await query;

        // Parse JSON fields
        const parsedRows = rows.map(row => ({
            ...row,
            allowed_depts: typeof row.allowed_depts === 'string' ? JSON.parse(row.allowed_depts || '[]') : (row.allowed_depts || []),
            allowed_users: typeof row.allowed_users === 'string' ? JSON.parse(row.allowed_users || '[]') : (row.allowed_users || [])
        }));

        res.json(parsedRows);
    } catch (err) {
        // Table might not exist if migration was missed, return empty safely for now
        console.error("Library Error:", err.message);
        res.json([]);
    }
};

export const getCategories = async (req, res) => {
    try {
        const categories = await knex('pustaka_categories').select('*');
        res.json(categories);
    } catch (err) {
        res.json([]);
    }
};

export const createGuide = async (req, res) => {
    try {
        const { title, content, category, description, icon, privacy, allowed_depts, allowed_users, owner } = req.body;
        const [id] = await knex('pustaka_guides').insert({
            title,
            category,
            description: description || content || '', // Use description, fallback to content if provided (backward compat payload), or empty
            icon,
            privacy,
            allowed_depts: JSON.stringify(allowed_depts || []),
            allowed_users: JSON.stringify(allowed_users || []),
            owner
        });
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePustakaGuide = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, icon, privacy, allowed_depts, allowed_users } = req.body;

        await knex('pustaka_guides').where('id', id).update({
            title,
            description,
            category,
            icon,
            privacy,
            allowed_depts: JSON.stringify(allowed_depts || []),
            allowed_users: JSON.stringify(allowed_users || [])
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deletePustakaGuide = async (req, res) => {
    try {
        const { id } = req.params;
        // Delete related slides first to avoid Foreign Key constraints (if ON DELETE CASCADE is missing)
        await knex('pustaka_slides').where('guide_id', id).del();

        // Then delete the guide
        await knex('pustaka_guides').where('id', id).del();
        res.json({ success: true });
    } catch (err) {
        console.error("Delete Guide Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const getGuideSlides = async (req, res) => {
    try {
        const { id } = req.params;
        const slides = await knex('pustaka_slides')
            .where('guide_id', id)
            .orderBy('step_order', 'asc'); // Fixed column name
        res.json(slides);
    } catch (err) {
        console.error("Library Error (Slides):", err.message);
        res.json([]);
    }
};

export const createPustakaSlide = async (req, res) => {
    try {
        const { guide_id, title, content, image_url, image, order_index } = req.body;
        const [id] = await knex('pustaka_slides').insert({
            guide_id,
            title,
            content,
            image: image_url || image, // Support both naming conventions
            step_order: order_index || 0
        });
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteSlidesByGuideId = async (req, res) => {
    try {
        const { guideId } = req.params;
        await knex('pustaka_slides').where('guide_id', guideId).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
