import { setMany, getMany } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

self.onmessage = async (event) => {
  const { data: [type, a1] } = event;
  switch (type) {
    case "getMany": {
      const result = await getMany(a1);
      self.postMessage(result);
      break;
    }
    case "setMany": {
      await setMany(a1);
      self.postMessage("ok");
      break;
    }
  }
};
