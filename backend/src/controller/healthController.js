const healthcheck = (req, res) => {
  res.json({
    success: true,
    message: "Splitzy api is running",
  });
};

export default healthcheck;
