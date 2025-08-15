#pragma once

struct GameApp {
  static constexpr const bool kMode = true;

  bool isRunning;           // 00
  float delta;              // 04
  void* context;            // 08

  DynArray<int32_t> buffer; // 10
  DynArray<char*> lines;    // 20

  HashMap<uint64_t, CString> pool;

  DynArray<Handle<void*>> components;
};
