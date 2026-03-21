export const mockUserPreferences = {
  persona: "Cyberpunk Executive",
  focus_areas: ["Security", "AI Trends", "Morning Schedule"],
};

export const mockUserData = {
  calendar: [
    { id: "cal_1", title: "Quarterly Security Review", time: "09:00 AM" },
    { id: "cal_2", title: "Sync with Hackathon Team", time: "02:00 PM" },
  ],
  tasks: [
    { id: "task_1", title: "Review RAG Pipeline Docs", status: "pending" },
    { id: "task_2", title: "Update GitHub Secret Redaction", status: "urgent" },
  ],
  slack_mentions: [
    { id: "slack_1", from: "Sarah (Hackathon Org)", message: "The render job is failing for segment 4." },
  ],
};

export const mockScriptJson = {
  script_metadata: {
    persona_applied: "Cyberpunk Executive",
    total_estimated_segments: 3,
  },
  timeline_segments: [
    {
      segment_id: 1,
      dialogue: "Good morning, Executive. Your security perimeter is stable, but we have a few critical updates for your morning schedule.",
      grounding_source_id: "cal_1",
      runware_b_roll_prompt: "Cyberpunk digital city skyline, neon lights, rainy atmosphere, 8k resolution",
      ui_action_card: {
        is_active: true,
        card_type: "calendar_join",
        title: "Join Security Review",
        action_button_text: "Join Now",
        action_payload: "https://zoom.us/j/123456789",
      },
    },
    {
      segment_id: 2,
      dialogue: "Sarah from the Hackathon team mentioned a failure in the render job. I've flagged this for your immediate review.",
      grounding_source_id: "slack_1",
      runware_b_roll_prompt: "Close up of a futuristic server rack with pulsing blue data lines",
      ui_action_card: {
        is_active: true,
        card_type: "email_reply",
        title: "Reply to Sarah",
        action_button_text: "Draft Reply",
        action_payload: "mailto:sarah@example.com",
      },
    },
    {
      segment_id: 3,
      dialogue: "Finally, your RAG pipeline documentation is ready for review. This will be the focus of your afternoon session.",
      grounding_source_id: "task_1",
      runware_b_roll_prompt: "Holographic data visualization of a neural network being organized",
      ui_action_card: {
        is_active: true,
        card_type: "link_open",
        title: "Open Documentation",
        action_button_text: "View Docs",
        action_payload: "https://github.com/knarayanareddy/morning-briefing-bot",
      },
    },
  ],
};
