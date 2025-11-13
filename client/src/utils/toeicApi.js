import apiRequest from "./apiRequest";

export const getToeicSets = () =>
  apiRequest.get("/toeic/sets").then((res) => res.data.items);

export const getToeicSet = (id) =>
  apiRequest.get(`/toeic/sets/${id}`).then((res) => res.data.data);

export const createToeicAttempt = (id, payload) =>
  apiRequest.post(`/toeic/sets/${id}/attempts`, payload).then((res) => res.data);
