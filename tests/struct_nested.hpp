#pragma once

struct Player {
  enum class Owner : int8_t {
    Player = 0,
    Johnny = 1,
    Puppet = 2,

    Count = 3,
    Invalid = 4
  };

  struct Binding {
    uint32_t id;
    Vector3 position;
    Vector3 rotation;
  };

  Vector3 position;
  Vector3 velocity;
  Vector3 rotation;

  Binding parent;
};
