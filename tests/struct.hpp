#pragma once

struct GameApp {
  static constexpr const bool kMode = true;

  bool isRunning;           // 0
  float delta;              // 4
  void* context;            // 8

  DynArray<int32_t> buffer;
  DynArray<char*> lines;

  HashMap<uint64_t, CString> pool;

  DynArray<Handle<void*>> components;
};
