#pragma once

struct GameApp {
  bool isRunning;           // 0
  float delta;              // 4
  void* context;            // 8

  DynArray<int32_t> buffer;
  DynArray<char*> lines;

  HashMap<uint64_t, CString> pool;
};
