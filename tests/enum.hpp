#pragma once

enum EGameMode {
  Singleplayer = 0,
  Multiplayer = 1,
  Count = 2,
  Invalid = 3
};

enum EShape : int8_t {
  Rectangle = 0,
  Circle = 1,
  Triangle = 2,
  Count,
  Invalid
};

enum ETextureFormat : uint16_t {
  RGB = 0,
  RGBA = 1,
  DXT = 2,

  RGB_Unsigned = RGB,
  DXT_Unsigned = DXT
}
