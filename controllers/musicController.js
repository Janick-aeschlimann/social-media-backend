const ytmusic = require("ytmusic_api_unofficial");

exports.searchSongs = async (req, res) => {
  const query = req.params.query;

  const results = await ytmusic.search(query, "song");

  res.send(
    results.content.map((song) => ({
      title: song.title,
      artist: song.artists[0]?.name || "Unknown",
      videoId: song.id,
      thumbnail: song.thumbnails[1].url,
      duration: song.duration.duration,
      durationFormatted: song.duration.formatted,
    }))
  );
};

exports.getSong = async (videoId) => {
  try {
    const song = await ytmusic.get(videoId);

    console.log(song);

    return {
      title: song.title,
      artist: song.artists[0]?.name || "Unknown",
      videoId: song.id,
      thumbnailUrl: song.thumbnails[1].url,
      duration: song.duration.duration,
    };
  } catch {
    return null;
  }
};
