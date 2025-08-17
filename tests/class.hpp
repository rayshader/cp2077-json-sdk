#pragma once

class ISerializable {
  CName typeName;
};

class IScriptable : public ISerializable {
  DynArray<CProperty*> properties;
  DynArray<CBaseFunction*> functions;
};
