package de.tum.in.www1.artemis.service.util;

import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

import org.springframework.web.util.UriComponentsBuilder;

public class UrlUtils {

    public static UriComponentsBuilder buildEndpoint(String baseUrl, List<String> pathSegments, Object... args) {
        // Counts how many variable segments we have in the URL, e.g. like ["some static var", "<some variable>"] has one variable segment
        int segmentCtr = 0;
        final var parsedSegments = new LinkedList<String>();
        // Go through all path segments and replace variable segments with the supplied args
        for (var pathSegment : pathSegments) {
            if (pathSegment.matches("<.*>")) {
                // If we don't have enough args, throw an error
                if (segmentCtr == args.length) {
                    throw new IllegalArgumentException("Unable to build endpoint. Too few arguments!" + Arrays.toString(args));
                }
                parsedSegments.add(String.valueOf(args[segmentCtr++]));
            }
            else {
                parsedSegments.add(pathSegment);
            }
        }
        // If there are too many args, throw an error since this should not be intended
        if (segmentCtr != args.length) {
            throw new IllegalArgumentException("Unable to build endpoint. Too many arguments! " + Arrays.toString(args));
        }

        return UriComponentsBuilder.fromHttpUrl(baseUrl).pathSegment(parsedSegments.toArray(new String[0]));
    }
}
