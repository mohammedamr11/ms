require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const { LavaShark } = require('lavashark');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const lavalink = new LavaShark({
  nodes: [
    {
      name: 'local-node',
      url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
      auth: process.env.LAVALINK_PASSWORD,
      secure: false,
    },
  ],
  sendWS: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  },
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  lavalink.connect(client.user.id);
});

client.on('raw', (d) => lavalink.updateVoiceState(d));

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.split(' ');
  const command = args.shift().toLowerCase();

  if (command === '!play') {
    const query = args.join(' ');
    if (!query) return message.reply('اكتب اسم الأغنية.');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('ادخل روم صوتي الأول.');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    const player = lavalink.createPlayer(message.guild.id);
    if (!player.connected) player.connect(voiceChannel.id, { selfDeaf: true });

    const result = await lavalink.search(query);
    if (!result.tracks.length) return message.reply('ملقتش نتائج.');

    const track = result.tracks[0];
    player.queue.add(track);
    message.reply(`تم إضافة: **${track.info.title}**`);

    if (!player.playing) await player.play();
  }

  if (command === '!skip') {
    const player = lavalink.players.get(message.guild.id);
    if (!player || !player.playing) return message.reply('مفيش حاجة بتشتغل.');
    await player.stop();
    message.reply('تم تخطي الأغنية.');
  }

  if (command === '!stop') {
    const player = lavalink.players.get(message.guild.id);
    if (!player) return message.reply('مفيش حاجة شغالة.');
    await player.destroy();
    message.reply('تم إيقاف المشغل.');
  }
});

client.login(process.env.DISCORD_TOKEN);