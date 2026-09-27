const retryDelays = [
  Duration(seconds: 5),
  Duration(seconds: 30),
  Duration(minutes: 2),
  Duration(minutes: 10),
];

Duration backoffFor(int attempts) => retryDelays[(attempts - 1).clamp(0, retryDelays.length - 1)];
