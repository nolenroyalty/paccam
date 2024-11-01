export const NUM_SLOTS_IN_LARGER_DIMENSION = 21;
export const SLOT_WIDTH_PERCENTAGE = 100 / NUM_SLOTS_IN_LARGER_DIMENSION;
export const PLAYER_SIZE_IN_SLOTS = 2;
export const BASE_SLOTS_MOVED_PER_SECOND = 2.5;
export const BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT = 3.5;
export const SLOTS_MOVED_PER_MOUTH_MOVE = 1;
export const MAX_PLAYERS = 4;
export const MAX_BANKED_BONUS_MOVEMENT = 2;
export const SPEED_MULTIPLIER_IF_SUPER = 1.2;
export const SUPER_DURATION = 5.1;

export const pelletSizeInSlots = (kind) => {
  if (kind === "pellet") {
    return 0.5;
  } else if (kind === "power-pellet") {
    return 0.75;
  } else if (kind === "fruit") {
    return 0.75;
  } else {
    throw new Error(`Unknown pellet kind: ${kind}`);
  }
};

export const GIF_STUFF = {
  // gif.js wants this with a 0x, canvas with a #
  alphaBackgroundCanvas: "#00FF00",
  alphaBackgroundGif: "0x00FF00",
  priorMouthFramesToSave: 12,
  subsequentMouthFramesToSave: 0,
  mouthSaveFrequency: 30, // save every ~30 ms
  gifDelay: 105, // 3.5 times slower than the save frequency
};
