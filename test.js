const fetch = require('node-fetch');

const {TOKEN, DOMAIN, NAME} = process.env;
const BASE_URL = 'https://api.digitalocean.com/v2';
let OLD_IP, DROPLET_ID, ASSIGNED, NEW_IP, RECORD;

const getOldIp = () => {
  console.log('==== getOldIp ====');

  return fetch(`${BASE_URL}/floating_ips`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  })
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      }

      throw 'Error: getOldIp';
    })
    .then(({ floating_ips: ips }) => {
      OLD_IP = ips[0].ip;

      if (ips.length == 1) {
        ASSIGNED = !!ips[0].droplet;
      } else {
        NEW_IP = ips[1].ip;
        DROPLET_ID = ips[1].droplet.id;
      }

      return 'getOldIp';
    });
}

const getDropletId = () => {
  console.log('==== getDropletId ====');

  if (DROPLET_ID) {
    return new Promise(resolve => resolve('getDropletId'));
  }

  return fetch(`${BASE_URL}/droplets`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  })
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      }

      throw 'Error: getDropletId';
    })
    .then(({ droplets: [{ id }] }) => {
      DROPLET_ID = id;

      return 'getDropletId';
    });
}

const unassignOldIp = () => {
  console.log('==== unassignOldIp ====');

  if (ASSIGNED) {
    return fetch(`${BASE_URL}/floating_ips/${OLD_IP}/actions`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify({ type: 'unassign' })
    })
      .then(resp => {
        if (resp.ok) {
          return resp.json();
        }

        throw 'Error: unassignOldIp';
      });
  }

  return new Promise(resolve => resolve('unassignOldIp'));
}

const completed = () => {
  console.log('==== completed ====');

  return fetch(`${BASE_URL}/floating_ips/${OLD_IP}/actions`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  })
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      }

      throw 'Error: completed';
    })
    .then(({ actions: [{ status }] }) => {
      if (status == 'completed') {
        return 'completed'
      }

      return completed();
    })
}

const assignNewIp = () => {
  console.log('==== assignNewIp ====');

  if (NEW_IP) {
    return new Promise(resolve => resolve('assignNewIp'));
  }

  return fetch(`${BASE_URL}/floating_ips`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    method: 'post',
    body: JSON.stringify({ droplet_id: DROPLET_ID })
  })
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      }

      console.log(resp.status)
      throw 'Error: assignNewIp';
    })
    .then(({ floating_ip: { ip } }) => {
      NEW_IP = ip;

      return 'assignNewIp';
    });
}

const getRecord = () => {
  console.log('==== getRecord ====');

  return fetch(`${BASE_URL}/domains/${DOMAIN}/records`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  })
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      }

      throw 'Error: getRecord';
    })
    .then(({ domain_records: records }) => {
      RECORD = records.find(r => r.name == NAME);

      return 'getRecord';
    });
}

const updateRecord = () => {
  console.log('==== updateRecord ====');

  if (RECORD.data != NEW_IP) {
    return fetch(`${BASE_URL}/domains/${DOMAIN}/records/${RECORD.id}`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      method: 'put',
      body: JSON.stringify({ data: NEW_IP })
    })
      .then(resp => {
        if (resp.ok) {
          return resp.json();
        }

        throw 'Error: updateRecord';
      });
  }

  return new Promise(resolve => resolve('updateRecord'));
}

const deleteOldIp = () => {
  console.log('==== deleteOldIp ====');

  return fetch(`${BASE_URL}/floating_ips/${OLD_IP}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    method: 'delete'
  })
    .then(resp => {
      if (resp.ok) {
        return 'deleteOldIp';
      }

      throw 'Error: deleteOldIp';
    });
}


const commit = (queues) => {
  if (queues.length > 0) {
    return queues[0]()
      .then(() => commit(queues.slice(1)))
      .catch(error => console.log(error));
  }

  return new Promise(resolve => resolve('committed'));
}

commit([getOldIp, getDropletId, unassignOldIp, completed, assignNewIp, completed, getRecord, updateRecord, deleteOldIp]);
