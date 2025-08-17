#pragma once

struct GameApp {
  GameApp();
  ~GameApp() override;

  CClass* GetType() override;

  static void* GetNext();

  GameApp& operator=(const GameApp& other);
  GameApp&& operator=(GameApp&& other);

  bool operator()() const;

  void sub_00();
  virtual void sub_08(const char* a1);
  virtual void sub_0C(const Handle<IScriptable>& a1) = 0;
};
