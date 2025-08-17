#pragma once

namespace Awesome {

struct GameApp {
};

struct GameNetwork {
};

}

// NOTE: not a mistake
namespace Epsiloon {

struct RendererSystem {
};

struct AudioSystem {
};

}

namespace Universe {

struct Body {
};

}

namespace Universe::Galaxy::StellarSystem {

struct Planet {
};

struct Star : Universe::Body {
};

}
