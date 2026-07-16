export const visualizationExportData = [
  {
    id: "gun-performance",
    name: "Gun Performance",
    icon: "mdi:target",
    entityTypes: ["weapon"],
    fieldCount: 14,
    fields: [
      { path: "weapon.projectile_result_kill_probability", label: "Kill Prob", type: "number", precision: 3 },
      { path: "weapon.projectile_result_kill_decay_start_time", label: "Decay Start", type: "number", precision: 3 },
      { path: "weapon.projectile_result_kill_decay_end_time", label: "Decay End", type: "number", precision: 3 },
      { path: "weapon.retrigger_time", label: "Fire Rate", type: "number", precision: 3 },
      { path: "weapon.magazine_size", label: "Magazine", type: "number", precision: 0 },
      { path: "weapon.projectile_speed", label: "Muzzle Vel", type: "number", precision: 0 },
      { path: "weapon.projectiles_per_shot", label: "Pellets", type: "number", precision: 0 },
      { path: "weapon.accuracy_factor", label: "Accuracy", type: "number", precision: 3 },
      { path: "weapon.sustained_fire_grow_step", label: "Recoil Step", type: "number", precision: 3 },
      { path: "weapon.sustained_fire_diminish_rate", label: "Recoil Recovery", type: "number", precision: 3 },
      { path: "weapon.sight_range_modifier", label: "Sight Range", type: "number", precision: 1 },
      { path: "weapon.can_shoot_standing", label: "Stance", type: "boolean" },
      { path: "weapon.suppressed", label: "Suppressed", type: "boolean" },
      { path: "weapon.reload_one_at_a_time", label: "Reload", type: "boolean" },
    ],
  },
  {
    id: "stance",
    name: "Stance Accuracy",
    icon: "mdi:run",
    entityTypes: ["weapon", "carry_item"],
    fieldCount: 1,
    fields: [
      { path: "weapon.accuracy_factor", label: "Accuracy Factor", type: "number", precision: 3 },
      {
        path: "weapon.stances", label: "Stances", type: "array",
        children: [
          { path: "weapon.stances.state_key", label: "State Key", type: "string" },
          { path: "weapon.stances.accuracy", label: "Stance Accuracy", type: "number", precision: 3 },
        ],
      },
    ],
  },
  {
    id: "projectile-ballistics",
    name: "Projectile Ballistics",
    icon: "mdi:chart-bell-curve",
    entityTypes: ["projectile"],
    fieldCount: 9,
    fields: [
      { path: "projectile.projectile_speed", label: "Speed", type: "number", precision: 0 },
      { path: "projectile.projectiles_per_shot", label: "Per Shot", type: "number", precision: 0 },
      { path: "projectile.pulldown_in_air", label: "Pulldown", type: "number", precision: 3 },
      { path: "projectile.throwable_max_speed", label: "Throw Max Speed", type: "number", precision: 0 },
      { path: "projectile.throwable_near_far_distance", label: "Near/Far Dist", type: "number", precision: 0 },
      { path: "projectile.throwable_curve_height", label: "Curve Height", type: "number", precision: 0 },
      { path: "projectile.throwable_randomness", label: "Randomness", type: "number", precision: 3 },
      { path: "projectile.throwable_speed_estimation_near", label: "Speed Est Near", type: "number", precision: 0 },
      { path: "projectile.throwable_speed_estimation_far", label: "Speed Est Far", type: "number", precision: 0 },
    ],
  },
  {
    id: "projectile-effects",
    name: "Projectile Effects",
    icon: "mdi:target",
    entityTypes: ["projectile"],
    fieldCount: 7,
    fields: [
      { path: "projectile.result_class", label: "Result Class", type: "string" },
      { path: "projectile.result_damage", label: "Damage", type: "number", precision: 3 },
      { path: "projectile.result_radius", label: "Radius", type: "number", precision: 3 },
      { path: "projectile.result_push", label: "Push", type: "number", precision: 3 },
      { path: "projectile.result_key", label: "Result Key", type: "string" },
      { path: "projectile.result_character_state", label: "Char State", type: "string" },
      { path: "projectile.radius", label: "Collision Radius", type: "number", precision: 3 },
    ],
  },
  {
    id: "projectile-behavior",
    name: "Projectile Behavior",
    icon: "mdi:cog",
    entityTypes: ["projectile"],
    fieldCount: 8,
    fields: [
      { path: "projectile.class", label: "Class", type: "string" },
      { path: "projectile.trigger_class", label: "Trigger Class", type: "string" },
      { path: "projectile.trigger_time_to_live", label: "TTL", type: "number", precision: 3 },
      { path: "projectile.slot", label: "Slot", type: "number", precision: 0 },
      { path: "projectile.can_be_disarmed", label: "Can Disarm", type: "boolean" },
      { path: "projectile.can_be_detected_by_driver", label: "Detect Driver", type: "boolean" },
      { path: "projectile.can_be_detected_by_footmen", label: "Detect Footmen", type: "boolean" },
      { path: "projectile.drop_count_factor_on_death", label: "Drop Factor", type: "number", precision: 3 },
    ],
  },
  {
    id: "projectile-economy",
    name: "Projectile Economy",
    icon: "mdi:currency-usd",
    entityTypes: ["projectile"],
    fieldCount: 6,
    fields: [
      { path: "projectile.inventory.price", label: "Price", type: "number", precision: 0 },
      { path: "projectile.inventory.encumbrance", label: "Weight", type: "number", precision: 3 },
      { path: "projectile.commonness.commonness_value", label: "Commonness Val", type: "number", precision: 3 },
      { path: "projectile.commonness.commonness_in_stock", label: "In Stock Val", type: "number", precision: 3 },
      { path: "projectile.commonness.can_respawn_with", label: "Respawn With", type: "boolean" },
      { path: "projectile.in_stock", label: "In Stock", type: "boolean" },
    ],
  },
  {
    id: "projectile-config",
    name: "Projectile Config",
    icon: "mdi:tune",
    entityTypes: ["projectile"],
    fieldCount: 5,
    fields: [
      { path: "projectile.time_to_live", label: "TTL", type: "number", precision: 3 },
      { path: "projectile.time_to_live_out_in_the_open", label: "TTL Open", type: "number", precision: 3 },
      { path: "projectile.use_time_to_live", label: "Use TTL", type: "boolean" },
      { path: "projectile.inherit_from", label: "Inherit From", type: "string" },
      { path: "projectile.on_ground_up", label: "On Ground Up", type: "string" },
    ],
  },
  {
    id: "projectile-visual",
    name: "Projectile Visual",
    icon: "mdi:image",
    entityTypes: ["projectile"],
    fieldCount: 5,
    fields: [
      { path: "projectile.model_mesh", label: "Model Mesh", type: "string" },
      { path: "projectile.hud_icon_filename", label: "HUD Icon", type: "string" },
      {
        path: "projectile.effects", label: "Effects", type: "array",
        children: [
          { path: "projectile.effects.class", label: "Effect Class", type: "string" },
        ],
      },
      {
        path: "projectile.sounds", label: "Sounds", type: "array",
        children: [
          { path: "projectile.sounds.class", label: "Sound Class", type: "string" },
        ],
      },
      {
        path: "projectile.trails", label: "Trails", type: "array",
        children: [
          { path: "projectile.trails.fileref", label: "Trail File", type: "string" },
        ],
      },
    ],
  },
  {
    id: "vehicle-stats",
    name: "Vehicle Stats",
    icon: "mdi:car",
    entityTypes: ["vehicle"],
    fieldCount: 0,
    fields: [
      {
        path: "vehicle.character_slots", label: "Crew Slots", type: "array",
        children: [
          { path: "vehicle.character_slots.type", label: "Slot Type", type: "string" },
          { path: "vehicle.character_slots.offset", label: "Slot Offset", type: "string" },
        ],
      },
      {
        path: "vehicle.turrets", label: "Turrets", type: "array",
        children: [
          { path: "vehicle.turrets.offset", label: "Turret Offset", type: "string" },
          { path: "vehicle.turrets.weapon_offset", label: "Weapon Offset", type: "string" },
        ],
      },
      {
        path: "vehicle.tire_sets", label: "Wheels", type: "array",
        children: [
          { path: "vehicle.tire_sets.offset", label: "Wheel Offset", type: "string" },
          { path: "vehicle.tire_sets.radius", label: "Wheel Radius", type: "number", precision: 3 },
        ],
      },
      { path: "vehicle.extent", label: "Dimensions", type: "array" },
      {
        path: "vehicle.visuals", label: "Textures", type: "array",
        children: [
          { path: "vehicle.visuals.class", label: "Texture Class", type: "string" },
          { path: "vehicle.visuals.mesh", label: "Mesh", type: "string" },
          { path: "vehicle.visuals.texture", label: "Texture File", type: "string" },
        ],
      },
      {
        path: "vehicle.tags", label: "Tags", type: "array",
        children: [
          { path: "vehicle.tags.name", label: "Tag Name", type: "string" },
        ],
      },
    ],
  },
  {
    id: "call-radio",
    name: "Radio Call",
    icon: "mdi:radio-tower",
    entityTypes: ["call"],
    fieldCount: 4,
    fields: [
      { path: "call.initiation_comment1", label: "Initiation", type: "string" },
      { path: "call.acknowledge_comment", label: "Acknowledge", type: "string" },
      { path: "call.launch_comment", label: "Launch", type: "string" },
      { path: "call.inventory.price", label: "Price", type: "number", precision: 0 },
      { path: "call.notify_metagame", label: "Global Notify", type: "boolean" },
      {
        path: "call.capacities", label: "Unlock", type: "array",
        children: [
          { path: "call.capacities.source", label: "Unlock Source", type: "string" },
          { path: "call.capacities.source_value", label: "Source Value", type: "number", precision: 3 },
          { path: "call.capacities.value", label: "Cap Value", type: "number", precision: 3 },
        ],
      },
      {
        path: "call.rounds", label: "Waves", type: "array",
        children: [
          { path: "call.rounds.launch_time", label: "Launch Time", type: "number", precision: 0 },
          { path: "call.rounds.spawn_time", label: "Spawn Time", type: "number", precision: 0 },
          { path: "call.rounds.instance_key", label: "Instance Key", type: "string" },
          { path: "call.rounds.instance_class", label: "Instance Class", type: "string" },
          { path: "call.rounds.instances", label: "Count", type: "number", precision: 0 },
        ],
      },
    ],
  },
  {
    id: "achievement",
    name: "Achievement",
    icon: "mdi:trophy",
    entityTypes: ["achievement"],
    fieldCount: 1,
    fields: [
      { path: "achievement.include_in_alltime_stats", label: "All-Time Stats", type: "boolean" },
      {
        path: "achievement.levels", label: "Levels", type: "array",
        children: [
          { path: "achievement.levels.rank.title", label: "Rank Title", type: "string" },
          { path: "achievement.levels.steam_achievement_id", label: "Steam ID", type: "string" },
        ],
      },
      {
        path: "achievement.criteria_list", label: "Criteria", type: "array",
        children: [
          { path: "achievement.criteria_list.class", label: "Criteria Class", type: "string" },
          { path: "achievement.criteria_list.description", label: "Description", type: "string" },
        ],
      },
    ],
  },
  {
    id: "faction",
    name: "Faction",
    icon: "mdi:flag",
    entityTypes: ["faction"],
    fieldCount: 5,
    fields: [
      { path: "faction.color", label: "Color", type: "array" },
      { path: "faction.chat_icon", label: "Chat Icon", type: "string" },
      { path: "faction.chat_icon_supporter", label: "Supporter Icon", type: "string" },
      { path: "faction.chat_icon_commander", label: "Commander Icon", type: "string" },
      { path: "faction.campaign_icon", label: "Campaign Icon", type: "string" },
      { path: "faction.radio_queue_size", label: "Radio Queue", type: "number", precision: 0 },
      {
        path: "faction.ranks", label: "Ranks", type: "array",
        children: [
          { path: "faction.ranks.name", label: "Rank Name", type: "string" },
          { path: "faction.ranks.xp", label: "XP", type: "number", precision: 3 },
          { path: "faction.ranks.hud_icon.filename", label: "Rank Icon", type: "string" },
        ],
      },
    ],
  },
  {
    id: "event-modifier",
    name: "Events & Modifiers",
    icon: "mdi:lightning-bolt",
    entityTypes: ["carry_item"],
    fieldCount: 1,
    fields: [
      { path: "carry_item.transform_on_consume", label: "Consumes", type: "string" },
      {
        path: "carry_item.events", label: "Events", type: "array",
        children: [
          { path: "carry_item.events.class", label: "Event Class", type: "string" },
          { path: "carry_item.events.input_character_state", label: "Input State", type: "string" },
          { path: "carry_item.events.output_character_state", label: "Output State", type: "string" },
        ],
      },
      {
        path: "carry_item.modifiers", label: "Modifiers", type: "array",
        children: [
          { path: "carry_item.modifiers.class", label: "Modifier Class", type: "string" },
          { path: "carry_item.modifiers.value", label: "Modifier Value", type: "number", precision: 3 },
        ],
      },
    ],
  },
  {
    id: "exchange",
    name: "Exchange Prizes",
    icon: "mdi:gift-open-outline",
    entityTypes: ["carry_item"],
    fieldCount: 0,
    fields: [
      {
        path: "carry_item.exchange_prizes", label: "Exchange Prizes", type: "array",
        children: [
          { path: "carry_item.exchange_prizes.category", label: "Category", type: "string" },
          { path: "carry_item.exchange_prizes.prize_pools", label: "Prize Pools", type: "array" },
        ],
      },
      {
        path: "carry_item.exchange_sources", label: "Exchange Sources", type: "array",
        children: [
          { path: "carry_item.exchange_sources.input", label: "Input Items", type: "string" },
          { path: "carry_item.exchange_sources.category", label: "Category", type: "string" },
        ],
      },
    ],
  },
  {
    id: "command-config",
    name: "Command Config",
    icon: "mdi:terminal",
    entityTypes: ["command_config"],
    fieldCount: 4,
    fields: [
      { path: "command_config.command", label: "Command", type: "string" },
      { path: "command_config.description", label: "Description", type: "string" },
      { path: "command_config.permission", label: "Permission", type: "string" },
      { path: "command_config.effects", label: "Effects", type: "string" },
    ],
  },
  {
    id: "clothing-degradation",
    name: "Clothing Degradation",
    icon: "mdi:shield-check",
    entityTypes: ["carry_item"],
    fieldCount: 5,
    fields: [
      { path: "carry_item.name", label: "Item Name", type: "string" },
      { path: "carry_item.transform_on_consume", label: "Degrades To", type: "string" },
      { path: "carry_item.commonness", label: "Rarity", type: "number", precision: 3 },
      { path: "carry_item.inventory.price", label: "Price", type: "number", precision: 0 },
      { path: "carry_item.inventory.encumbrance", label: "Weight", type: "number", precision: 3 },
      {
        path: "carry_item.modifiers", label: "Damage Protection", type: "array",
        children: [
          { path: "carry_item.modifiers.class", label: "Damage Type", type: "string" },
          { path: "carry_item.modifiers.input_character_state", label: "Required State", type: "string" },
          { path: "carry_item.modifiers.output_character_state", label: "Result State", type: "string" },
        ],
      },
    ],
  },
];
