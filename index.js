const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = {
    TOKEN: process.env.TOKEN,
    PREFIX: "!"
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Enlace directo de la imagen oficial de SirenMc
const IMAGEN_SIRENMC = "https://cdn.discordapp.com/attachments/1498839434647441478/1508063329845776455/Screenshot_20260524-050445.Google.png?ex=6a142cec&is=6a12db6c&hm=d982b9f4852e2e8c4a4307e68c3f90426cd66f69e6bb34a5f83a249f9895853c&";

// Persistencia de configuración local (Mantiene los canales tras reinicios en Railway)
const dbPath = path.join(__dirname, 'database.json');
let db = {
    tickets: { canal: null, categoria: null, rolStaff: null },
    bienvenidas: { canal: null },
    boosts: { canal: null }
};

if (fs.existsSync(dbPath)) {
    try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch (e) { console.log("Inicializando base de datos interna..."); }
}
const saveDB = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

client.once('ready', () => {
    console.log(`🧜‍♀️ Sistema centralizado de SirenMc iniciado como: ${client.user.tag}`);
    client.user.setActivity('play.sirenmc.net', { type: 3 });
});

// --- SISTEMA DE COMANDOS ADMINISTRATIVOS Y PÚBLICOS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. Configuración de Canales Auxiliares (Bienvenidas y Boosts)
    if (command === 'setcanal') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const tipo = args[0]?.toLowerCase();
        const canal = message.mentions.channels.first();

        if (!tipo || !canal || (tipo !== 'bienvenidas' && tipo !== 'boosts')) {
            return message.reply('ℹ️ **Uso del comando:** `!setcanal [bienvenidas/boosts] #canal`');
        }

        db[tipo].canal = canal.id;
        saveDB();
        return message.reply(`✅ El canal de **${tipo}** ha sido vinculado correctamente a ${canal}.`);
    }

    // 2. Configuración Principal del Panel de Soporte
    if (command === 'tickets') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const canalPanel = message.mentions.channels.first();
        const categoriaId = args[1];
        const rolStaff = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

        if (!canalPanel || !categoriaId || !rolStaff) {
            return message.reply('ℹ️ **Parámetros requeridos:**\n`!tickets <#canal-del-panel> <ID-de-la-categoria> <@RolStaff>`');
        }

        db.tickets.canal = canalPanel.id;
        db.tickets.categoria = categoriaId;
        db.tickets.rolStaff = rolStaff.id;
        saveDB();

        const embedTickets = new EmbedBuilder()
            .setTitle('🧜‍♀️ CENTRO DE ATENCIÓN AL JUGADOR — SIRENMC')
            .setDescription('Bienvenido a la plataforma de soporte oficial de **SirenMc Network**. Nuestro equipo de gestión e infraestructura está disponible para resolver cualquier inconveniente relacionado con tu experiencia de juego.\n\n**📌 Información Importante antes de proceder:**\n• Por favor, selecciona la categoría que se adecúe con exactitud a tu problema.\n• El uso indebido, bromas o spam dentro de este ecosistema conllevará una sanción directa en la Network.\n• Mantén una conducta respetuosa y aporta la mayor cantidad de pruebas posibles (capturas de pantalla, coordenadas o ID de transacciones) para agilizar tu trámite.')
            .setColor('#007BFF')
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network • Compromiso y Calidad', iconURL: message.guild.iconURL() });

        const menuSeleccion = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_tickets')
                .setPlaceholder('Despliega este menú para seleccionar una categoría...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Soporte General').setValue('Soporte').setEmoji('🎫').setDescription('Dudas institucionales, reclamos de rangos o problemas comunes.'),
                    new StringSelectMenuOptionBuilder().setLabel('Ayuda Técnica').setValue('Ayuda').setEmoji('🛠️').setDescription('Problemas críticos de rendimiento, crash o fallos de conexión.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Jugador').setValue('Reportar').setEmoji('🚫').setDescription('Denuncia a usuarios que utilicen ventajas ilegales o alteren el chat.'),
                    new StringSelectMenuOptionBuilder().setLabel('Problemas con la Tienda').setValue('Tienda').setEmoji('🛒').setDescription('Consultas o retrasos en la entrega de paquetes comprados.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportes al Staff').setValue('Reportes').setEmoji('⚖️').setDescription('Apelaciones directas o quejas fundamentadas sobre un miembro del equipo.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Bugs').setValue('Bugs').setEmoji('🐛').setDescription('Errores de programación dentro de las modalidades que afecten el juego.'),
                    new StringSelectMenuOptionBuilder().setLabel('Solicitud de Revives').setValue('Revives').setEmoji('❤️').setDescription('Casos legítimos de pérdidas por fallos internos del servidor.'),
                    new StringSelectMenuOptionBuilder().setLabel('Apelaciones de Sanción').setValue('Apelaciones').setEmoji('🔓').setDescription('Presenta tu caso si consideras que tu baneo o muteo fue injusto.')
                )
        );

        await canalPanel.send({ embeds: [embedTickets], components: [menuSeleccion] });
        return message.reply(`✅ Panel de soporte desplegado de manera óptima en el canal ${canalPanel}`);
    }

    // 3. Comando Informativo de Conexión
    if (command === 'ip') {
        const embedIp = new EmbedBuilder()
            .setTitle('🌐 DATOS DE CONEXIÓN — SIRENMC NETWORK')
            .setColor('#00C3FF')
            .setDescription('Aquí tienes toda la información requerida para unirte a nuestra comunidad desde cualquier plataforma compatible.')
            .addFields(
                { name: '🔹 Dirección IP Principal (Java)', value: '`play.sirenmc.net`', inline: false },
                { name: '🔹 Puerto Oficial (Bedrock)', value: '`19132`', inline: true },
                { name: '🔹 Tienda del Servidor', value: '[tienda.sirenmc.net](https://tienda.sirenmc.net)', inline: true }
            )
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network' });
        return message.reply({ embeds: [embedIp] });
    }

    // 4. Comandos de Simulación (Test)
    if (command === 'testbienvenida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        client.emit('guildMemberAdd', message.member);
        return message.reply('⚙️ Se ha ejecutado la simulación del evento de bienvenida.');
    }

    if (command === 'testboost') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        // Simulación forzada modificando temporalmente la propiedad del miembro de prueba
        const viejoMiembro = { ...message.member, premiumSince: null };
        const nuevoMiembro = { ...message.member, premiumSince: new Date() };
        client.emit('guildMemberUpdate', viejoMiembro, nuevoMiembro);
        return message.reply('⚙️ Se ha ejecutado la simulación del evento de Nitro Boost.');
    }
});

// --- PROCESAMIENTO DE INTERACCIONES (MENÚS, FORMULARIOS Y BOTONES) ---
client.on('interactionCreate', async (interaction) => {
    // Apertura del Formulario (Modal)
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tickets') {
        const categoriaElegida = interaction.values[0];

        if (!db.tickets.categoria || !db.tickets.rolStaff) {
            return interaction.reply({ content: '❌ El área de soporte no se encuentra vinculada a una categoría válida en este momento.', ephemeral: true });
        }

        // CONTROL DE UN TICKET MÁXIMO POR PERSONA
        const prefijoCanal = `ticket-${categoriaElegida.toLowerCase()}-`.replace(/\s+/g, '-');
        const sufijoUsuario = interaction.user.username.toLowerCase();
        
        const yaTieneTicket = interaction.guild.channels.cache.find(canal => 
            canal.parentID === db.tickets.categoria && 
            canal.name.includes(sufijoUsuario)
        );

        if (yaTieneTicket) {
            return interaction.reply({ content: `⚠️ Dispones actualmente de un canal de asistencia activo dentro de nuestro servidor. Por favor, dirígete a ${yaTieneTicket} para continuar con tu consulta.`, ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`modal_ticket_${categoriaElegida}`)
            .setTitle(`Formulario de Acceso: ${categoriaElegida}`);

        const inputIgn = new TextInputBuilder()
            .setCustomId('ticket_ign')
            .setLabel('IGN (Tu Nickname exacto de Minecraft)')
            .setPlaceholder('Ejemplo: SirenPlayer_X')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const inputMotivo = new TextInputBuilder()
            .setCustomId('ticket_motivo')
            .setLabel('Explica los motivos de tu solicitud')
            .setPlaceholder('Describe de forma clara y extensa la situación para darte una solución rápida.')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputIgn),
            new ActionRowBuilder().addComponents(inputMotivo)
        );

        await interaction.showModal(modal);
    }

    // Recepción e Implementación del Formulario Enviado
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
        await interaction.deferReply({ ephemeral: true });

        const tipoTicket = interaction.customId.replace('modal_ticket_', '');
        const ign = interaction.fields.getTextInputValue('ticket_ign');
        const motivo = interaction.fields.getTextInputValue('ticket_motivo');

        // Formato limpio para el nombre del canal privado
        const nombreCanal = `ticket-${tipoTicket}-${interaction.user.username}`.toLowerCase().replace(/\s+/g, '-');

        const ticketChannel = await interaction.guild.channels.create({
            name: nombreCanal,
            type: ChannelType.GuildText,
            parent: db.tickets.categoria,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: db.tickets.rolStaff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ],
        });

        const embedTicketInterno = new EmbedBuilder()
            .setTitle(`🧜‍♀️ CANAL DE ASISTENCIA — CATEGORÍA: ${tipoTicket.toUpperCase()}`)
            .setDescription('El personal de administración ha recibido una notificación sobre la apertura de este canal. Un moderador cualificado se hará cargo de tu situación.\n\n*Mientras aguardas una respuesta, puedes adjuntar las pruebas necesarias en este chat.*')
            .setColor('#007BFF')
            .addFields(
                { name: '📌 Usuario de Discord', value: `${interaction.user}`, inline: true },
                { name: '🎮 Nick en Servidor (IGN)', value: `\`${ign}\``, inline: true },
                { name: '📝 Declaración o Motivo', value: motivo, inline: false }
            )
            .setImage(IMAGEN_SIRENMC)
            .setTimestamp();

        const filaBotones = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('reclamar_ticket')
                .setLabel('Reclamar Caso')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🛡️'),
            new ButtonBuilder()
                .setCustomId('cerrar_ticket')
                .setLabel('Cerrar Canal')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({ 
            content: `||${interaction.user} | <@&${db.tickets.rolStaff}>||`, 
            embeds: [embedTicketInterno], 
            components: [filaBotones] 
        });

        return interaction.editReply({ content: `✅ Canal de soporte creado de forma exitosa. Accede aquí: ${ticketChannel}` });
    }

    // --- ACCIÓN DE BOTONES DENTRO DE LOS TICKETS ---
    if (interaction.isButton()) {
        // Botón de Reclamar Ticket
        if (interaction.customId === 'reclamar_ticket') {
            const esStaff = interaction.member.roles.cache.has(db.tickets.rolStaff) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!esStaff) {
                return interaction.reply({ content: '❌ No posees los rangos requeridos para adjudicarte este caso de soporte.', ephemeral: true });
            }

            const filaModificada = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reclamar_ticket')
                    .setLabel(`Tomado por ${interaction.user.username}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cerrar_ticket')
                    .setLabel('Cerrar Canal')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await interaction.message.edit({ components: [filaModificada] });
            return interaction.reply({ content: `⚖️ El miembro del Staff ${interaction.user} ha asumido de forma exclusiva el seguimiento de este ticket.` });
        }

        // Botón de Cerrar Ticket
        if (interaction.customId === 'cerrar_ticket') {
            await interaction.reply({ content: '🔒 El proceso de archivado ha dado inicio. El canal será removido en 5 segundos.' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch(e){}
            }, 5000);
        }
    }
});

// --- CAPTURA DE EVENTOS AUTOMÁTICOS (BIENVENIDAS Y BOOSTS) ---
client.on('guildMemberAdd', async (member) => {
    if (!db.bienvenidas.canal) return;
    const channel = member.guild.channels.cache.get(db.bienvenidas.canal);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🧜‍♀️ ¡BIENVENIDO A SIRENMC NETWORK! 🧜‍♀️')
        .setDescription(`¡Hola, ${member}! Te damos una cálida bienvenida a nuestra comunidad de Discord.\n\nNos alegra enormemente que hayas decidido formar parte de nuestro ecosistema de juego. Te recomendamos encarecidamente que te dirijas a las normativas de convivencia para disfrutar de tu estadía de forma sana y segura en cada una de nuestras modalidades activas.`)
        .setColor('#007BFF')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Miembro oficial número #${member.guild.memberCount}`, iconURL: member.guild.iconURL() });

    channel.send({ content: `¡Te damos la bienvenida a la Network, ${member}!`, embeds: [embed] });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (!db.boosts.canal) return;
    const channel = oldMember.guild.channels.cache.get(db.boosts.canal);
    if (!channel) return;

    // Validación de transición hacia Nitro Booster
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const embed = new EmbedBuilder()
            .setTitle('💎 ¡SIRENMC DISPONE DE UN NUEVO NITRO BOOST! 💎')
            .setDescription(`Queremos expresar nuestro más sincero agradecimiento a ${newMember} por decidir impulsar nuestra comunidad mediante su **Nitro Boost**.\n\nTu apoyo directo nos permite expandir las capacidades tecnológicas de nuestra red. Tus recompensas y rangos estéticos de donador se han asignado de manera inmediata dentro del servidor. ¡Disfrútalos! ✨`)
            .setColor('#ff73fa')
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));

        channel.send({ content: `🎉 ¡Muchas gracias por el soporte, ${newMember}!`, embeds: [embed] });
    }
});

client.login(config.TOKEN);
