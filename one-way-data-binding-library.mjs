import scan from "object-scan";
import { produce } from "immer";

export default (bindings) => {
  let state = {};
  let bound = new Map();

  const processor = (update) => {
    state = produce(state, update);

    const nextBound = new Map();
    const keysToDelete = new Set(bound.keys());

    const scanResult = scan(Object.keys(bindings), {
      joined: true,
      rtn: ["key", "value", "matchedBy"],
    })(state);

    for (const [key, data, matchedBy] of scanResult) {
      for (const match of matchedBy) {
        if (!bound.has(key)) {
          const methods = bindings[match]();
          nextBound.set(key, { methods, data });
          if (methods.create) {
            methods.create(data, state);
          }
        } else {
          const existingEntry = bound.get(key);
          const existingMethods = existingEntry.methods;
          if (existingMethods.update && data !== existingEntry.data) {
            nextBound.set(key, { methods: existingMethods, data });
            existingMethods.update(data, state);
          } else {
            nextBound.set(key, existingEntry);
          }
        }
        keysToDelete.delete(key);
      }
    }

    for (const key of keysToDelete) {
      const methods = bound.get(key).methods;
      if (methods.delete) {
        methods.delete(state);
      }
    }

    bound = nextBound;

    return processor;
  };

  return processor;
};
