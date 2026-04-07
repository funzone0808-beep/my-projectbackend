const express = require("express");
const { supabase } = require("../utils/supabase");

const router = express.Router();

router.get("/hotel/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from("hotel_profiles")
      .select("*")
      .eq("hotel_slug", slug)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Hotel profile not found"
      });
    }

    res.json({
      success: true,
      hotel: data
    });
  } catch (error) {
    console.error("Public hotel fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch hotel profile"
    });
  }
});

router.get("/menu/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("hotel_slug", slug)
      .eq("is_available", true)
      .eq("is_archived", false)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const groupedMenu = {};

    for (const item of data || []) {
      const category = item.category || "others";

      if (!groupedMenu[category]) {
        groupedMenu[category] = [];
      }

      groupedMenu[category].push({
        id: item.item_id,
        name: item.name,
        desc: item.description || "",
        price: Number(item.price || 0),
        image: item.image || "",
        alt: item.alt || item.name || "",
        badge: item.badge || "",
        tag: item.tag || ""
      });
    }

    res.json({
      success: true,
      menu: groupedMenu
    });
  } catch (error) {
    console.error("Public menu fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu"
    });
  }
});

module.exports = router;