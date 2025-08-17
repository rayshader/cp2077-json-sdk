#pragma once

template<typename T>
struct Vector {
  T* items;          // 00
  uint32_t size;     // 08
  uint32_t capacity; // 0C
};

template<typename K, typename V>
struct Pair {
  K key;
  V value;
};

template<typename K, typename V>
struct Map {
  Pair<K, V>* pairs;
  uint32_t size;
  uint32_t capacity;
};

template<typename T, uint32_t N>
struct Array {
  T items[N];
  uint32_t size;
}
