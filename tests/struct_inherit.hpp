#pragma once

struct Entity {
};

struct GameObject : Entity {
};

template<typename T>
struct ASystem {
};

struct AudioSystem : ASystem<GameObject> {
};
