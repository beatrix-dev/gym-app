package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** Runs the real CloudFront Function source under node. */
class SpaRewriteTest {

    private static final Path SCRIPT = Path.of("src/main/resources/spa-rewrite.js");

    @Test
    void routesWithoutExtensionServeIndexHtml() throws Exception {
        assertEquals("/index.html", rewrite("/meals"));
        assertEquals("/index.html", rewrite("/workouts/42"));
        assertEquals("/index.html", rewrite("/"));
    }

    @Test
    void fileRequestsAreUnchanged() throws Exception {
        assertEquals("/assets/app.js", rewrite("/assets/app.js"));
        assertEquals("/config.json", rewrite("/config.json"));
    }

    private static String rewrite(String uri) throws Exception {
        String program = "const fs = require('fs');"
                + "const handler = new Function(fs.readFileSync(process.argv[1], 'utf8') + '; return handler;')();"
                + "process.stdout.write(handler({ request: { uri: process.argv[2] } }).uri);";
        Process process = new ProcessBuilder("node", "-e", program, SCRIPT.toString(), uri)
                .redirectErrorStream(true)
                .start();
        String output = new String(process.getInputStream().readAllBytes());
        assertEquals(0, process.waitFor(), output);
        return output;
    }
}
