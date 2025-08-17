#pragma once

/*
enum ESystemPoolSize : uint32_t {
  Audio = 1024
};
*/

struct GameApp {
  static constexpr const bool kMode = true;
  static constexpr const float kPi = 3.141592;
  static constexpr const int32_t kMax = 128;
  static constexpr const uint32_t kAudioSize = static_cast<uint32_t>(ESystemPoolSize::Audio);
  static constexpr const auto kBool = FNV1a64("Bool");

  bool isRunning;           // 00
  float delta;              // 04
  void* context;            // 08

  DynArray<int32_t> buffer; // 10
  DynArray<char*> lines;    // 20

  uint8_t unk30[0x4B - 0x30]; // 30
  uint8_t unk4B[0x10]; // 4B
  uintptr_t unk78[(0x138 - 0x78) >> 3];

  HashMap<uint64_t, CString> pool;

  DynArray<Handle<void*>> components;

  game::vehicle::BaseObject vehicle;
  game::Object* gameObject;
  Handle<game::world::worldNode> world;
  Handle<game::Object*> gameObjectRef;

  Array<float, 4> vector;
  uint32_t fixedConstant[kMax];
  Array<void*, kMax> resources;

  Array<uint32_t, kAudioSize> pool[kAudioSize];
};
